import datetime
import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse
import uvicorn
from dotenv import load_dotenv
from supabase import create_client, Client
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Charger les variables d'environnement
load_dotenv()

# Configuration Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL et SUPABASE_KEY doivent être définis dans le fichier .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# App metadata
app = FastAPI()

# Configuration du rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Trop de requêtes. Réessayez plus tard."}
    )

app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:8000",
        "http://127.0.0.1",
        "http://127.0.0.1:8000",
        "https://portailweb-universita-corsica.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Endpoint de santé pour garder l'API réveillée."""
    return {
        "status": "ok",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


def verify_username(username: str) -> bool:
    """Vérifie si le username est un numéro étudiant valide"""
    try:
        user_id = int(username)
        return 18000000 < user_id < 20271000
    except:
        return False


def add_event(event_type: str):
    """
    Ajoute un événement dans la table events avec le timestamp actuel
    event_type: 'loginTime', 'loginTimeVerified', 'scanTimeQr', 'scanTimeUrl'
    """
    try:
        supabase.table("events").insert({
            "event_type": event_type,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        print(f"Erreur lors de l'ajout de l'événement: {e}")


def increment_stat(key: str, amount: int = 1):
    """
    Incrémente un compteur dans la table stats
    key: 'count_form_login' ou 'count_form_login_verified'
    """
    try:
        # Récupérer la valeur actuelle
        result = supabase.table("stats").select("value").eq("key", key).single().execute()
        current_value = result.data.get("value", 0) if result.data else 0
        
        # Mettre à jour avec la nouvelle valeur
        supabase.table("stats").update({
            "value": current_value + amount
        }).eq("key", key).execute()
    except Exception as e:
        print(f"Erreur lors de l'incrémentation du compteur: {e}")


@app.post("/login")
@limiter.limit("5/day")
async def login(request: Request, username: str = Form(...)):
    """Endpoint de connexion - Limité à 5 requêtes par minute par IP"""
    try:
        increment_stat("count_form_login", 1)
        add_event("loginTime")
    except Exception as e:
        print(f"Erreur: {e}")
    
    if verify_username(username):
        print("Login verified")
        add_event("loginTimeVerified")
        try:
            increment_stat("count_form_login_verified", 1)
        except Exception as e:
            print(f"Erreur: {e}")
    else:
        raise HTTPException(status_code=400, detail="Login not verified")
    
    return {"status": 200, "detail": "Login verified"}


@app.post("/scan")
@limiter.limit("1/day")
async def scan(request: Request, support: str = Form(None)):
    """Endpoint pour enregistrer les scans QR/URL - Limité à 30 requêtes par minute par IP"""
    try:
        content_type = request.headers.get("content-type", "")
        if content_type.startswith("application/json"):
            body = await request.json()
            support_val: str = body.get("support")
        else:
            support_val: str = support

        if support_val and support_val.lower() == "qrcode":
            add_event("scanTimeQr")
        else:
            add_event("scanTimeUrl")
            
        return {"status": 200, "detail": "Scan recorded"}
    except Exception as e:
        print(f"Erreur: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'enregistrement du scan")


@app.post("/link_click")
async def link_click(request: Request, link_name: str = Form(None)):
    """Endpoint pour enregistrer les clics sur les liens d'apprentissage"""
    try:
        content_type = request.headers.get("content-type", "")
        if content_type.startswith("application/json"):
            body = await request.json()
            link_name_val: str = body.get("link_name", "unknown")
        else:
            link_name_val: str = link_name or "unknown"

        # Incrémenter le compteur global de clics
        increment_stat("count_visite_links", 1)
        
        # Enregistrer l'événement avec les métadonnées du lien
        try:
            supabase.table("events").insert({
                "event_type": "linkClick",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "metadata": {"link_name": link_name_val}
            }).execute()
        except Exception as e:
            # Si la colonne metadata n'existe pas, enregistrer sans
            print(f"Erreur metadata (normal si colonne non créée): {e}")
            add_event("linkClick")
            
        return {"status": 200, "detail": "Link click recorded"}
    except Exception as e:
        print(f"Erreur: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'enregistrement du clic")


@app.get("/stats")
async def stats():
    """Récupère toutes les statistiques pour le dashboard"""
    try:
        # Récupérer les compteurs
        stats_result = supabase.table("stats").select("key, value").execute()
        stats_dict = {item["key"]: item["value"] for item in stats_result.data}
        
        # Récupérer tous les événements
        events_result = supabase.table("events").select("event_type, timestamp, metadata").order("timestamp").execute()
        
        # Organiser les événements par type
        events_by_type = {
            "loginTime": [],
            "loginTimeVerified": [],
            "scanTimeQr": [],
            "scanTimeUrl": [],
            "linkClick": []
        }
        
        # Liste pour stocker les détails des clics par lien
        link_clicks_details = []
        
        for event in events_result.data:
            event_type = event["event_type"]
            if event_type in events_by_type:
                events_by_type[event_type].append(event["timestamp"])
                
                # Si c'est un clic sur un lien, stocker aussi les métadonnées
                if event_type == "linkClick" and event.get("metadata"):
                    link_clicks_details.append({
                        "timestamp": event["timestamp"],
                        "link_name": event["metadata"].get("link_name", "unknown")
                    })
        
        return {
            "dataStats": {
                "count_form_login": stats_dict.get("count_form_login", 0),
                "count_form_login_verified": stats_dict.get("count_form_login_verified", 0),
                "count_visite_links": stats_dict.get("count_visite_links", 0)
            },
            "dataVisits": events_by_type,
            "linkClicksDetails": link_clicks_details
        }
    except Exception as e:
        print(f"Erreur lors de la récupération des stats: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des statistiques")


# python app.py
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=False)
# or uvicorn app:app --host localhost --port 8000 --reload
#!/usr/bin/env python3

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    description="E-KLaim Backend Application",
    version=1.0
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def home():
    return {"message":"Welcome to E-Klaim"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        port=8000,
        reload=True
    )
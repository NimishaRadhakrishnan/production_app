# Deployment Guide (Render)

This repository is configured to be deployed on [Render](https://render.com) using a Blueprints `render.yaml` configuration. Follow these manual steps to successfully deploy and verify the application.

## 1. Prerequisites

1. **Render Account**: Ensure you have an active account on Render and are logged in.
2. **GitHub Connection**: Your GitHub account must be connected to Render, and Render needs access to this repository.

## 2. Deploying via Blueprint

1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **New** and select **Blueprint**.
3. Connect this GitHub repository.
4. Render will read the `render.yaml` file and automatically propose the following services:
   - `postgis` (Private Service)
   - `redis` (Redis)
   - `backend` (Web Service)
   - `frontend` (Web Service)
5. You will be prompted to provide values for the following environment variables (which are set to `sync: false` in `render.yaml` for security):
   - `POSTGRES_PASSWORD`: Generate a strong, random password and paste it here.
   - `JWT_SECRET_KEY`: Generate a strong, secure random string (e.g., using `openssl rand -hex 32`) and paste it here.
   - `CORS_ALLOWED_ORIGINS`: Provide a placeholder like `["http://localhost:3000"]` for now. You will come back to update this in step 4.
   - `NEXT_PUBLIC_API_BASE_URL`: Provide a placeholder like `http://localhost:8000/api/v1` for now. You will come back to update this in step 4.
6. Click **Apply** or **Deploy** to start the first build process.

## 3. Seeding the Database

Once the **backend** service finishes deploying and is healthy:
1. In the Render Dashboard, click into the **backend** web service.
2. Navigate to the **Shell** tab.
3. Run the following command to populate the database with the initial demo data (this is required to test logins):
   ```bash
   python seed_demo_data.py
   ```
   *Note: This script uses the actual database credentials provided in your environment variables.*

## 4. Connecting Frontend and Backend

Render handles most internal service discovery for databases, but since the frontend expects the backend's external URL at **build time**, and the backend needs the frontend's external URL for CORS:

1. Copy the public URL of your **backend** service (e.g., `https://backend-xxxx.onrender.com`).
2. Copy the public URL of your **frontend** service (e.g., `https://frontend-xxxx.onrender.com`).
3. In the Render Dashboard, go to your **frontend** service's **Environment** tab.
   - Update `NEXT_PUBLIC_API_BASE_URL` to be the backend URL + `/api/v1` (e.g., `https://backend-xxxx.onrender.com/api/v1`).
4. Go to your **backend** service's **Environment** tab.
   - Update `CORS_ALLOWED_ORIGINS` to include the frontend URL in a JSON array format (e.g., `["https://frontend-xxxx.onrender.com"]`).
5. **Important**: Since the frontend bakes the API URL at build time, you must trigger a **Manual Deploy > Clear build cache & deploy** on the frontend service after updating its environment variable.

## 5. Verification & Smoke Test

A smoke test script has been provided to verify that the backend is fully operational, connected to the DB/Redis, and that the seeded data works.

Run this script locally from your terminal, passing in the deployed backend URL:

```bash
./backend/scripts/smoke_test_deploy.sh https://backend-xxxx.onrender.com
```

If the smoke test passes, the backend is fully verified!

## 6. Next Steps

- **Mobile App**: The mobile app at `mobile/src/services/api.ts` currently hardcodes `http://localhost:8000/api/v1`. Once the backend URL is finalized, you will need to update the mobile app's API client to point to the new deployed backend URL.

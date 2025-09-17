@echo off
REM Load JWT_SECRET from .env file and deploy to production
for /f "tokens=2 delims==" %%a in ('findstr "JWT_SECRET=" .env') do set JWT_SECRET=%%a
cd workers
wrangler deploy --env production --var JWT_SECRET:%JWT_SECRET%
cd ..
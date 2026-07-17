FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY SportTracker.sln .
COPY SportTracker.Core/SportTracker.Core.csproj SportTracker.Core/
COPY SportTracker.App/SportTracker.App.csproj SportTracker.App/
RUN dotnet restore SportTracker.App/SportTracker.App.csproj

COPY SportTracker.Core/ SportTracker.Core/
COPY SportTracker.App/ SportTracker.App/

RUN dotnet publish SportTracker.App/SportTracker.App.csproj -c Release -o /app/publish --no-restore

FROM nginx:alpine
COPY --from=build /app/publish/wwwroot /usr/share/nginx/html
COPY SportTracker.App/nginx.conf /etc/nginx/conf.d/default.conf
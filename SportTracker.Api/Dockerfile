FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copie les .csproj en premier pour profiter du cache Docker (layers)
COPY SportTracker.sln .
COPY SportTracker.Core/SportTracker.Core.csproj SportTracker.Core/
COPY SportTracker.Data/SportTracker.Data.csproj SportTracker.Data/
COPY SportTracker.Api/SportTracker.Api.csproj SportTracker.Api/
COPY SportTracker.App/SportTracker.App.csproj SportTracker.App/
RUN dotnet restore SportTracker.Api/SportTracker.Api.csproj

# Copie le reste du code source
COPY SportTracker.Core/ SportTracker.Core/
COPY SportTracker.Data/ SportTracker.Data/
COPY SportTracker.Api/ SportTracker.Api/

# Télécharge le dataset exercises (non versionné dans git)
RUN mkdir -p SportTracker.Data/Seed && \
    curl -fsSL https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json \
    -o SportTracker.Data/Seed/exercises.json

RUN dotnet publish SportTracker.Api/SportTracker.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SportTracker.Api.dll"]
"""Integração com Google Cloud Scheduler para agendar sync por cliente.

Cada cliente vira um job nomeado `sync-cliente-<cliente_id>` que faz POST no
endpoint interno `/api/v1/internal/instagram/sync/{cliente_id}` com header
`X-Internal-Token: <INTERNAL_SYNC_TOKEN>`.
"""

from uuid import UUID

from google.api_core.exceptions import NotFound
from google.cloud import scheduler_v1

from app.core.config import settings


class SchedulerError(Exception):
    pass


def _client() -> scheduler_v1.CloudSchedulerClient:
    return scheduler_v1.CloudSchedulerClient()


def _parent() -> str:
    if not settings.GCP_PROJECT_ID:
        raise SchedulerError("GCP_PROJECT_ID não configurado")
    return f"projects/{settings.GCP_PROJECT_ID}/locations/{settings.GCP_LOCATION}"


def _job_name(cliente_id: UUID) -> str:
    return f"{_parent()}/jobs/sync-cliente-{cliente_id}"


def _build_job(cliente_id: UUID, cron: str) -> scheduler_v1.Job:
    if not settings.SCHEDULER_TARGET_BASE_URL:
        raise SchedulerError("SCHEDULER_TARGET_BASE_URL não configurado")
    if not settings.INTERNAL_SYNC_TOKEN:
        raise SchedulerError("INTERNAL_SYNC_TOKEN não configurado")

    url = (
        f"{settings.SCHEDULER_TARGET_BASE_URL.rstrip('/')}"
        f"/api/v1/internal/instagram/sync/{cliente_id}"
    )
    return scheduler_v1.Job(
        name=_job_name(cliente_id),
        description=f"Sync Instagram para cliente {cliente_id}",
        schedule=cron,
        time_zone=settings.SCHEDULER_TIMEZONE,
        http_target=scheduler_v1.HttpTarget(
            uri=url,
            http_method=scheduler_v1.HttpMethod.POST,
            headers={"X-Internal-Token": settings.INTERNAL_SYNC_TOKEN},
        ),
    )


def upsert_job(cliente_id: UUID, cron: str) -> str:
    """Cria ou atualiza o job. Retorna o nome completo do job."""
    client = _client()
    job = _build_job(cliente_id, cron)
    try:
        client.get_job(name=job.name)
        client.update_job(job=job)
    except NotFound:
        client.create_job(parent=_parent(), job=job)
    return job.name


def delete_job(cliente_id: UUID) -> bool:
    """Remove o job. Retorna True se deletou, False se não existia."""
    client = _client()
    try:
        client.delete_job(name=_job_name(cliente_id))
        return True
    except NotFound:
        return False

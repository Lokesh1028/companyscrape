"""
Background job queue hooks (optional).

`run_research_pipeline` in `app.services.research_service` is synchronous/async-callable
from FastAPI today. For Celery/RQ/Arq, import that function inside a worker task:

    @celery_app.task
    def research_task(company_name: str, report_id: int) -> None:
        ...
"""

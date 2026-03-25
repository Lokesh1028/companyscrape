"""Domain errors surfaced to HTTP with stable codes for clients."""


class AppError(Exception):
    def __init__(self, message: str, *, code: str = "app_error", status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class ResearchPipelineError(AppError):
    def __init__(self, message: str, *, code: str = "research_failed"):
        super().__init__(message, code=code, status_code=503)

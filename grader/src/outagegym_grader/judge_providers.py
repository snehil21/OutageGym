import os
from collections.abc import Callable, Mapping
from typing import Any
from urllib.parse import urlparse

from langchain_anthropic import ChatAnthropic
from langchain_core.exceptions import OutputParserException
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from pydantic import ValidationError

from outagegym_grader.judge_schema import JudgeOutput

LOCAL_OLLAMA_HOSTS = frozenset({"host.docker.internal", "localhost", "127.0.0.1"})
OPENAI_BASE_URL = "https://api.openai.com/v1"
ANTHROPIC_BASE_URL = "https://api.anthropic.com"


class JudgeProviderError(RuntimeError):
    pass


def _required(environment: Mapping[str, str], name: str) -> str:
    value = environment.get(name, "").strip()
    if not value:
        raise JudgeProviderError(f"Missing required environment variable: {name}")
    return value


def _ollama_url(environment: Mapping[str, str]) -> str:
    base_url = environment.get(
        "OLLAMA_BASE_URL", "http://host.docker.internal:11434"
    ).rstrip("/")
    parsed = urlparse(base_url)
    if (
        parsed.scheme != "http"
        or parsed.hostname not in LOCAL_OLLAMA_HOSTS
        or parsed.port != 11434
    ):
        raise JudgeProviderError(
            "OLLAMA_BASE_URL must target a local Ollama endpoint on port 11434"
        )
    return base_url


def create_chat_model(
    provider: str,
    model: str,
    environment: Mapping[str, str],
) -> Any:
    if provider == "ollama":
        return ChatOllama(
            model=model,
            base_url=_ollama_url(environment),
            temperature=0,
            reasoning=False,
            num_predict=2048,
            repeat_penalty=1.2,
        )
    if provider == "openai":
        return ChatOpenAI(
            model=model,
            api_key=_required(environment, "OPENAI_API_KEY"),
            base_url=OPENAI_BASE_URL,
            temperature=0,
            timeout=120,
            max_retries=1,
        )
    if provider == "anthropic":
        return ChatAnthropic(
            model=model,
            api_key=_required(environment, "ANTHROPIC_API_KEY"),
            base_url=ANTHROPIC_BASE_URL,
            temperature=0,
            timeout=120,
            max_retries=1,
        )

    raise JudgeProviderError(
        f"Unsupported AI_JUDGE_PROVIDER: {provider}. "
        "Choose one of: ollama, openai, anthropic"
    )


ModelFactory = Callable[[str, str, Mapping[str, str]], Any]


def generate_judge_output(
    provider: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    environment: Mapping[str, str] = os.environ,
    model_factory: ModelFactory = create_chat_model,
) -> JudgeOutput:
    try:
        chat_model = model_factory(provider, model, environment)
        structured_model = chat_model.with_structured_output(JudgeOutput)
        result = structured_model.invoke(
            [("system", system_prompt), ("human", user_prompt)]
        )
    except JudgeProviderError:
        raise
    except OutputParserException as error:
        raise JudgeProviderError("Judge returned invalid structured output") from error
    except (ValidationError, ValueError, TypeError) as error:
        raise JudgeProviderError(
            f"Judge returned invalid structured output: {error}"
        ) from error
    except Exception as error:
        raise JudgeProviderError(f"Judge provider request failed: {error}") from error

    if not isinstance(result, JudgeOutput):
        raise JudgeProviderError("Judge did not return the expected structured output")
    return result

from typing import Any, Callable, Optional

import httpx


BatchPostFn = Callable[[str, dict], dict]


def execute_batch(
    post_fn: BatchPostFn,
    requests: list[tuple[str, dict]],
    concurrency: int = 3,
) -> list[Any]:
    results: list[Any] = []
    for i in range(0, len(requests), concurrency):
        chunk = requests[i:i + concurrency]
        chunk_results = []
        for endpoint_key, data in chunk:
            chunk_results.append(post_fn(endpoint_key, data))
        results.extend(chunk_results)
    return results


async def execute_batch_async(
    post_fn: Callable[[str, dict], Any],
    requests: list[tuple[str, dict]],
    concurrency: int = 3,
) -> list[Any]:
    import asyncio
    results: list[Any] = []
    for i in range(0, len(requests), concurrency):
        chunk = requests[i:i + concurrency]
        tasks = [post_fn(endpoint_key, data) for endpoint_key, data in chunk]
        chunk_results = await asyncio.gather(*tasks)
        results.extend(chunk_results)
    return results

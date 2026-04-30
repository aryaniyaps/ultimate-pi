---
type: source
source_type: benchmark-report
author: Naman Bansal / Supermemory AI
date_published: 2025-06-27
url: https://supermemory.ai/blog/best-open-source-embedding-models-benchmarked-and-ranked/
confidence: high
key_claims:
  - "MiniLM-L6-v2: 78.1% top-5 retrieval, 14.7ms/1K tokens, 68ms latency, 1.2GB GPU"
  - "E5-Base-v2: 83.5% top-5 retrieval, 20.2ms/1K tokens, 79ms latency, 2.0GB GPU"
  - "BGE-Base-v1.5: 84.7% top-5 retrieval, 22.5ms/1K tokens, 82ms latency, 2.1GB GPU"
  - "Nomic Embed v1: 86.2% top-5 retrieval, 41.9ms/1K tokens, 110ms latency, 4.8GB GPU"
  - "MiniLM-L6-v2 is 5-8% lower accuracy than larger models but 3x faster"
tags:
  - embedding-models
  - benchmark
  - minilm
  - bge
  - e5
  - nomic
---

# Best Open-Source Embedding Models Benchmarked and Ranked (2025)

## Summary

Comprehensive benchmark of four leading open-source embedding models on BEIR TREC-COVID dataset using FAISS flat L2 index. Provides accuracy, latency, and compute cost trade-offs.

## Benchmark Results

| Model | Embed Time (ms/1K tok) | Latency (ms) | Top-5 Accuracy | GPU Memory |
|-------|----------------------|------------|----------------|------------|
| MiniLM-L6-v2 | 14.7 | 68 | 78.1% | ~1.2 GB |
| E5-Base-v2 | 20.2 | 79 | 83.5% | ~2.0 GB |
| BGE-Base-v1.5 | 22.5 | 82 | 84.7% | ~2.1 GB |
| Nomic Embed v1 | 41.9 | 110 | 86.2% | ~4.8 GB |

## Trade-off Analysis

- **Speed-first**: MiniLM-L6-v2 — best for high-volume, low-latency, edge deployments
- **Balanced**: E5-Base-v2 or BGE-Base-v1.5 — strong accuracy at reasonable latency
- **Accuracy-first**: Nomic Embed v1 — best precision but 2x slower, GPU-dependent

## Relevance to Our Implementation

MiniLM-L6-v2's 78.1% vs Nomic's 86.2% is an 8.1 percentage point gap on general text retrieval. For code retrieval, the gap is likely wider since MiniLM was trained on general text, not code. However, with AST-aware chunking + contextualized text, the effective gap narrows significantly because the chunking quality improvement (per Vectara NAACL 2025) can outweigh the embedding model choice.

---
type: source
source_type: research-paper
author: Xiangyang Li, Kuicai Dong, Yi Quan Lee, Wei Xia, Yichun Yin, Hao Zhang, Yong Liu, Yasheng Wang, Ruiming Tang
date_published: 2024-07-03
url: https://arxiv.org/abs/2407.02883
confidence: high
key_claims:
  - "CoIR is the leading benchmark for code information retrieval, accepted at ACL 2025 Main"
  - "10 curated code datasets, 8 retrieval tasks across 7 domains, 2M+ documents"
  - "Trusted by Voyage, Jina, BGE, Salesforce, OpenAI, Google, Qwen, NV-Embed"
  - "Integrated into MTEB leaderboard for cross-benchmark evaluation"
  - "Pip-installable Python framework (coir-eval)"
tags:
  - benchmark
  - code-retrieval
  - embeddings
  - coir
  - mteb
---

# CoIR: A Comprehensive Benchmark for Code Information Retrieval Models

## Summary

ACL 2025 Main paper introducing CoIR, the standard benchmark for evaluating code embedding/retrieval models. 10 curated datasets, 8 retrieval tasks, 7 domains, 2M+ documents. Integrated into the MTEB leaderboard.

## Top Models on CoIR Leaderboard

The CoIR leaderboard is adopted by major embedding providers:
- **Voyage AI**: voyage-code-3 (top-ranked)
- **Salesforce**: SFR-Embedding-Code-2B_R
- **BAAI**: bge-code-v1
- **Jina AI**: jina-embeddings-v4
- **Qwen**: Qwen3-Embedding
- **OpenAI**: text-embedding-3 series
- **Google**: Gemini embedding models
- **NVIDIA**: NV-Embed

## Framework

- Install: `pip install coir-eval`
- Compatible with MTEB/BEIR data schema
- Supports custom models and API-based models
- 10 tasks: codetrans-dl, stackoverflow-qa, apps, codefeedback-mt, codefeedback-st, codetrans-contest, synthetic-text2sql, cosqa, codesearchnet, codesearchnet-ccr

## Relevance to Our Implementation

CoIR is the benchmark we should use to evaluate our embedding pipeline. If we want to validate whether all-MiniLM-L6-v2 with good chunking approaches larger model quality, we run CoIR eval and compare against the leaderboard.

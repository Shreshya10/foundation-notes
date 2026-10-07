# Foundation-Notes App (Track C - Split It)

[![CI](https://github.com/YOUR_GITHUB_USERNAME/foundation-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_GITHUB_USERNAME/foundation-notes/actions/workflows/ci.yml)

| Field | Details |
|---|---|
| **Student Name** | Shreshya Raj |
| **Roll Number** | 2505162 |
| **Track** | **Track C — Split It: S3 Front End and EC2 API** |
| **Deployment Cloud** | AWS (`ap-south-1`)[MUMBAI] |
---

## 1. Project Overview

This repository implements a full-stack containerized Notes application built on Linux, containerized with Docker, published via GitHub Actions to GitHub Container Registry (GHCR), and deployed on AWS. 

Under **Track C (Split It)**, the architectural boundaries are cleanly decoupled:
* **Frontend:** Decoupled static single-page application (HTML/CSS/JS) hosted on an **Amazon S3 Static Website** bucket.
* **Backend:** Express.js REST API running inside Docker on an **Amazon EC2 (Ubuntu 24.04 LTS)** instance.
* **Database:** PostgreSQL container with persistent Docker named volumes, private network isolation, and Adminer accessible strictly through secure loopback SSH tunneling.
* **Cross-Origin Resource Sharing (CORS):** Strict origin-level CORS configured on the backend using the exact S3 static website endpoint.

---

variable "github_owner" {
  type = string
}

variable "github_repo" {
  type = string
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "ai_api_key" {
  type      = string
  sensitive = true
}
# OpenAI API Setup

The portfolio backend uses OpenAI for chatbot answers when no knowledge-base answer matches. The key is optional: without it, the chatbot continues to use its knowledge base and safe fallback response.

## Recommended model

The default is `gpt-5.6-luna`, selected for a responsive, cost-conscious portfolio chatbot. For stronger answers at a higher cost, change `OPENAI_MODEL` to `gpt-5.6-terra`.

OpenAI's current model guide and prices are available at:

- https://developers.openai.com/api/docs/models
- https://developers.openai.com/api/docs/models/gpt-5.6-luna

## Local setup

1. Sign in at https://platform.openai.com/.
2. Add billing or credits at https://platform.openai.com/settings/organization/billing/overview.
3. Create a project API key at https://platform.openai.com/api-keys.
4. If `portfolio-server/.env` does not exist, copy `.env.example` to `.env`.
5. Set these values in `portfolio-server/.env`:

   ```env
   OPENAI_API_KEY=your_project_api_key_here
   OPENAI_MODEL=gpt-5.6-luna
   ```

6. Restart the NestJS backend so it reloads the environment variables:

   ```powershell
   cd C:\Users\Lenovo\Desktop\PROJECTS\MY_PORTFOLIO\portfolio-server
   npm run start:dev
   ```

7. Open the public portfolio chatbot and send a question that is not an exact knowledge-base match. Confirm the answer uses portfolio context; check backend logs for configuration errors if it falls back.

## Deployment

On Render, add `OPENAI_API_KEY` and `OPENAI_MODEL` under the backend service's environment variables, then redeploy or restart the service. Do not add the key to Vercel or prefix it with `VITE_`.

## Is it free?

No. OpenAI API usage is billed separately according to the selected model and the tokens used. The GPT-5.6 Luna free tier is not supported. A new account might show promotional or test credits, but the application should not depend on them; confirm the available balance in the billing dashboard.

## Security

- Never commit `.env`; the server already ignores it through `.gitignore`.
- Never put the key in `portfolio-client`, browser code, screenshots, logs, or chat messages.
- Use a project-scoped key, set a spending limit in the OpenAI Platform, and rotate the key immediately if it is exposed.
- Do not paste the real key into `.env.example`; that file is committed as a template.

## Troubleshooting

- `401`: the key is invalid, revoked, or copied incorrectly. Create a new project key and restart the server.
- `429`: billing, credits, rate limits, or the project budget need attention.
- Chatbot returns its fallback response: check the backend logs. An OpenAI request error is logged without exposing the API key.
- Model access error: temporarily set `OPENAI_MODEL` to a model available to the project, restart the backend, and retest.

window.addEventListener('DOMContentLoaded', () => {
  window.ui = window.SwaggerUIBundle({
    url: '/openapi.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    docExpansion: 'list',
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
  });
});

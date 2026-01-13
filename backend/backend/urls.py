from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.views.generic import TemplateView

urlpatterns = [
    path('learnsphere-management/', admin.site.urls),  # Secret admin URL
    path('api/', include('api.urls')),
    
    # Static and Media files
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]

# Catch-all for React frontend
urlpatterns += [
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]
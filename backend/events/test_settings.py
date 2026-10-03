import os

# Set dummy DATABASE_URL before importing config.settings so test runner doesn't fail on missing env var
os.environ.setdefault('DATABASE_URL', 'postgresql://dummy_user:dummy_pass@localhost:5432/dummy_db')

from config.settings import *

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'core',
    'accounts',
    'events',
]

ROOT_URLCONF = 'events.test_urls'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

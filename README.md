#NodeCached
This is a very simplistic caching system writen in nodejs

Example configuration:
```json
{
  "app": {
    "host": "127.0.0.1",
    "post": 2486
  },
  "cds": {
    "base_url": "https://storage.sbg.cloud.ovh.net/v1/AUTH_09eb860780a34c9b959e3eebbf15da7f/storage/"
  },
  "caching": {
    "cache_time": 3600,
    "max_cache_size": 2048
  }
}
```
|Option|Doc|
|----|-------|
|app.host|The host that the app is listening on|
|app.port|The port that the app is listening on|
|cds.base_url| Url of you backend content (In this case my bucket)|v
|caching.cache_time|Max lifetime of an inactive cached file (Time is reset to zero each request)|
|caching.max_cache_size|Max size in mb of the cache folder|

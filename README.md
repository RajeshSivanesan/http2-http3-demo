# http2-http3-demo
Exploration of how http2, http3 works and understand the ideology behind multiplexing

# To generate a local cert (dev only):
```
mkdir -p cert && \
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
-keyout cert/server.key -out cert/server.crt \
-subj "/CN=localhost"
```

# I tried hard to get Http 3 protocol using caddy 
# as a reverse proxy on top of the localhost:443
# But it didn't work out, it was still in H2 protocol
# satisfied all criteria but still browser was not showing it as H3

# how to install caddy
Caddy can be downloaded from internet
Just set the environment variables for that .exe
then we should be able to run caddy commands

# if not go for internal
where the root certificate should be trusted by caddy

import Mapbox from '@rnmapbox/maps';

export const MAPBOX_PUBLIC_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ??
  'pk.eyJ1IjoiamJsYWNrODk3NiIsImEiOiJjbXcyemU5dHkwNGY3MnpxM3BydmM1OHYxIn0.kSW6TjW0KXsj8rir0oiBZw';

// Inicializa o token público do Mapbox uma única vez
Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

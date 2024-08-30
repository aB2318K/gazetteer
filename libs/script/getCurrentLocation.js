export async function getLocation() {
  if (navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const coordinates = {
        latitude: latitude,
        longitude: longitude
      };
      return coordinates;
    } catch (error) {
      throw error;
    }
  } else {
    throw new Error("Geolocation is not supported by this browser.");
  }
} 
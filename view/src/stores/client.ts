import { createClient } from "@propelauth/javascript";
import { ref } from "vue";
import axios from "axios";

export const user = ref(null);

export const client = createClient({
  authUrl: import.meta.env.VITE_PROPELAUTH_URL,
  enableBackgroundTokenRefresh: false,
});

export const authenticate = async () => {
  // Seems a bug that this call the api multiple times...
  const authInfo = await client.getAuthenticationInfoOrNull();
  if (!authInfo) {
    client.redirectToLoginPage();
  }

  console.log("You are logged in as " + authInfo.user.email); //
  user.value = authInfo.user;
  axios.defaults.headers.common[
    "Authorization"
  ] = `Bearer ${authInfo.accessToken}`;
};

export const logout = () => {
  client.logout(false);
  client.redirectToLoginPage();
};

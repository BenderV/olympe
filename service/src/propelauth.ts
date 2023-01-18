import { initAuth } from '@propelauth/express';
import * as _ from 'lodash';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const verifierKey = _.replace(
  process.env.PROPELAUTH_VERIFIER_KEY,
  new RegExp('\\\\n', 'g'),
  '\n',
);

export default initAuth({
  authUrl: process.env.PROPELAUTH_URL,
  apiKey: process.env.PROPELAUTH_APIKEY,
  manualTokenVerificationMetadata: {
    verifierKey: verifierKey,
    issuer: process.env.PROPELAUTH_ISSUER,
  },
});

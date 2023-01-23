/*
 * Wrapper for propelauth/express
 * If process.env.PROPELAUTH_URL is undefined, then have a mockup auth server
 * Otherwise, use the real auth server
 */

import { initAuth } from '@propelauth/express';
import * as _ from 'lodash';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const verifierKey = _.replace(
  process.env.PROPELAUTH_VERIFIER_KEY,
  new RegExp('\\\\n', 'g'),
  '\n',
);

let auth: Auth;
class Auth {
  optionalUser: any;
  fetchUserMetadataByUserId: any;
}

if (process.env.PROPELAUTH_URL === undefined) {
  auth = {
    optionalUser: (req: any, res: any, next: any) => {
      req.user = {
        userId: 'admin',
        orgIdToOrgMemberInfo: {},
      };
      next();
    },
    fetchUserMetadataByUserId: (userId: any, includeOrgs: any) => {
      return {
        userId: 'admin',
        email: 'admin@localhost',
        enabled: true,
        orgIdToOrgInfo: {},
        // unixTimestamp in seconds
        lastActiveAt: Math.round(new Date().getTime() / 1000).toString(),
      };
    },
  };
} else {
  auth = initAuth({
    authUrl: process.env.PROPELAUTH_URL,
    apiKey: process.env.PROPELAUTH_APIKEY,
    manualTokenVerificationMetadata: {
      verifierKey: verifierKey,
      issuer: process.env.PROPELAUTH_ISSUER,
    },
  });
}

export default auth;

import 'server-only';
import { BrasilApiProvider } from './brasil-api';
import { AuthorizedIeProvider,ManualStateRegistrationProvider } from './state-registration';
export function companyProviders() {
  return {company:new BrasilApiProvider(),ie:process.env.IE_PROVIDER_URL && process.env.IE_PROVIDER_TOKEN ? new AuthorizedIeProvider(process.env.IE_PROVIDER_URL,process.env.IE_PROVIDER_TOKEN) : new ManualStateRegistrationProvider()};
}

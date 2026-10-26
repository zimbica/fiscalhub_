import 'server-only';
import { BrasilApiProvider } from './brasil-api';
import { AuthorizedIeProvider,ManualStateRegistrationProvider } from './state-registration';
import { CnpjaIeProvider } from './cnpja';
export function companyProviders() {
  return {company:new BrasilApiProvider(),ie:process.env.IE_PROVIDER_URL && process.env.IE_PROVIDER_TOKEN ? new AuthorizedIeProvider(process.env.IE_PROVIDER_URL,process.env.IE_PROVIDER_TOKEN) : process.env.CNPJA_API_KEY ? new CnpjaIeProvider(process.env.CNPJA_API_KEY) : new ManualStateRegistrationProvider()};
}

/* eslint-disable react/jsx-props-no-spreading */
import { AppProps } from 'next/app'

export default function MyApp ({ Component, pageProps }: AppProps): JSX.Element {
  return <Component {...pageProps} />
}
import { redirect } from 'next/navigation';
export default function HomeRedirect() {
  redirect('/presave');
  return null;
}
export { default as HomePage } from './HomePage';

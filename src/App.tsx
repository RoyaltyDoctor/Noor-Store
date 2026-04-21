/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

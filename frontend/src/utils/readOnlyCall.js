// src/utils/readOnlyCall.js
import { serializeCV, cvToJSON } from '@stacks/transactions';
import { Buffer } from 'buffer';
import { STACKS_NETWORK } from '../constants';

export async function readOnlyCall({ contractAddress, contractName, functionName, functionArgs, senderAddress }) {
  const url = `${STACKS_NETWORK.client.baseUrl}/v2/contracts/call-readonly`;
  const body = {
    contract_address: contractAddress,
    contract_name: contractName,
    function_name: functionName,
    sender_address: senderAddress,
    arguments: functionArgs.map(arg => Buffer.from(serializeCV(arg)).toString('hex')),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Read-only call failed');

  return cvToJSON(data.result);
}

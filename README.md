# RGB proxy server

![workflow](https://user-images.githubusercontent.com/31323835/172648333-efd666c0-d8c3-48d8-b290-117c590c684c.png)

RGB proxy server is intended to facilitate the relay of client-side data
between RGB wallets, enabling a better user experience for wallet users.

The API it implements adheres to the
[RGB HTTP JSON-RPC protocol](https://github.com/RGB-Tools/rgb-http-json-rpc).

The proxy server is designed to handle the following workflow:

- The payer of an RGB transfer posts the transfer
  consignment file to the server, typically using the blinded UTXO (provided
  by the payee in the invoice) as identifier for the file.
- The payee asks the server for the consignment file associated with the
  identifier (e.g. the blinded UTXO).
- If there is a file associated to the provided identifier, the server returns
  the file to the payee.
- The payee validates the retrieved consignment file.
- If the consignment is valid, the payee posts an ACK to the server, otherwise
  a NACK is posted to inform the payer that the RGB transfer should be
  considered as failed.
- The payer asks the server for the ACK/NACK status associated with the
  previously posted consignment file. If the consignment has been ACKed by the
  payee, the payer will proceed with broadcasting the Bitcoin transaction
  containing the commitment to the RGB consignment.

The RGB proxy server does not need to be trusted by the users as it is only
intended to facilitate communication between wallets.
Anyone can deploy an RGB proxy server instance, so while the server operator
can still perform censorship attacks towards users, concerns can be avoided by
simply using a different server provider or by self-hosting an instance.

This project was originally implemented in
[grunch/rgb-proxy-server](https://github.com/grunch/rgb-proxy-server).

## Offline Receiver: Server-Side Consignment Validation for RGB Proxy Server

This opt-in feature adds **optional server-side consignment validation** using `@utexo/rgb-lib`: the same validation library that wallets use. When enabled, the proxy validates consignments at upload time and automatically sets the ACK/NACK, removing the need for the receiver to be online during the critical validation window.

The receiver can retrieve the consignment and import it at their convenience; the transfer is not blocked by their availability.

### Why?

- **Fire-and-forget transfers.** Senders complete a transfer without waiting for the receiver. The proxy validates and ACKs on their behalf, allowing the sender to broadcast immediately. This makes RGB UX comparable to on-chain Bitcoin: send and done.
- **Mobile and intermittent connectivity.** Mobile wallets are frequently offline. Users can receive RGB assets even if their phone is off during the transfer; they import the consignment next time they open the app.
- **Asynchronous workflows.** Batch payments, scheduled distributions, airdrops, point-of-sale flows where the merchant settles later; none require the receiver to interact during the transfer.
- **Reduced transfer failure rates.** In the relay-only model, transfers fail or time out if the receiver doesn't respond. Server-side validation eliminates this class of failures.
- **Graceful degradation.** If the Electrum indexer is unreachable or the validation library throws, the proxy falls back to relay-only mode. The transfer is never blocked; it just requires the receiver to validate manually, same as before.

### Trust Assumptions

The relay-only proxy is **trustless**: a dumb relay that can only censor, never forge or validate. Server-side validation changes the trust model.

Relay-only proxy:** The proxy is untrusted. It can censor or delay, but cannot forge consignments, fake ACKs, or move funds. The receiver validates with their own node and indexer. Even a malicious proxy cannot approve an invalid transfer.

**Offline receiver (server-side validation):** The proxy becomes **semi-trusted**. New trust assumptions:

- **Receiver trusts the proxy to validate correctly.** The receiver is trusting that the proxy runs the correct validation library, that its Electrum server is honest and synced, and that the operator is not running modified code that auto-ACKs everything.
- **Receiver trusts the proxy's Electrum indexer.** Validation requires checking Bitcoin state. A compromised indexer could feed false data, causing the proxy to ACK an invalid consignment.
- **Sender trusts the proxy's ACK.** With server-side validation, the ACK comes from the proxy, not the receiver. The sender trusts it means the consignment is genuinely valid.
- **The receiver can no longer override a server-validated ACK.** Once the proxy auto-ACKs, the ack field is immutable. If the receiver later disagrees, they cannot change it.

## Running the app

### Locally

```sh
# install dependencies
npm install

# run in dev mode on port 3000
npm run dev

# generate production build
npm run build

# run generated content in dist folder on port 3000
npm run start
```

### In docker

```sh
docker run -d ghcr.io/rgb-tools/rgb-proxy-server
```

For data persistence, mount a host path to `/home/node/.rgb-proxy-server`
inside the container. The directory needs to be owned by user and group `1000`.

### Data

Data is stored in `$HOME/.rgb-proxy-server` by default.

The default data path can be overridden via the `APP_DATA` environment variable.

## Example usage

The payee generates an RGB invoice and sends it to the payer (not covered
here). Let's assume the invoice contains the blinded UTXO `blindTest`.

The payer prepares the transfer, then sends the consignment file and the
related txid to the proxy server, using the blinded UTXO from the invoice as
identifier:

```sh
# let's create a fake consignment file and send it
echo "consignment binary data" > consignment.rgb
curl -X POST -H 'Content-Type: multipart/form-data' \
  -F 'jsonrpc=2.0' -F 'id="1"' -F 'method=consignment.post' \
  -F 'params[recipient_id]=blindTest' -F 'params[txid]=527f2b2ebb81c873f128848d7226ecdb7cb4a4025222c54bfec7c358d51b9207' -F 'file=@consignment.rgb' \
  localhost:3000/json-rpc

# example output
# {"jsonrpc":"2.0","id":"1","result":true}
```

The payee requests the consignment for the blinded UTXO:

```sh
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "2", "method": "consignment.get", "params": {"recipient_id": "blindTest"} }' \
  localhost:3000/json-rpc

# example output
# {"jsonrpc":"2.0","id":"2","result": {"consignment": "Y29uc2lnbm1lbnQgYmluYXJ5IGRhdGEK", "txid": "527f2b2ebb81c873f128848d7226ecdb7cb4a4025222c54bfec7c358d51b9207"}}

```

The file is returned as a base64-encoded string:

```sh
echo 'Y29uc2lnbm1lbnQgYmluYXJ5IGRhdGEK' | base64 -d

# example output
# consignment binary data
```

If the consignment is valid, the payee ACKs it:

```sh
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "3", "method": "ack.post", "params": {"recipient_id": "blindTest", "ack": true} }' \
  localhost:3000/json-rpc

# example output
# {"jsonrpc":"2.0","id":"3","result":true}
```

If the consignment is invalid, the payee NACKs it:

```sh
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "4", "method": "ack.post", "params": {"recipient_id": "blindTest", "ack": false} }' \
  localhost:3000/json-rpc

# example output
# {"jsonrpc":"2.0","id":"4","result":true}
```

The payer requests the `ack` value (`null` if payee has not called `ack.post`
yet):

```sh
curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "5", "method": "ack.get", "params": {"recipient_id": "blindTest"} }' \
  localhost:3000/json-rpc

# example output
# {"jsonrpc":"2.0","id":"5","result":true}
```

In case of approval the transaction can be broadcast, otherwise the two parties
need to abort the transfer process and start from scratch.

The consignment or media file for any given recipient ID and the related
approval cannot be changed once submitted.

## Testing

```sh
# install dependencies
npm run install

# run test suite
npm run test
```

## Formatting

```sh
# format the code
npm run format
```

## Linting

```sh
# run linter
npm run lint

# fix lint issues
npm run lint:fix
```

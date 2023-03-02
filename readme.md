# AWS Route 53 Geolocation Updater

This GitHub Action updates the geolocation records of a domain in AWS Route 53 based on a list of country or continent codes, using AWS CLI. It also has the ability to dynamically remove any outdated geolocation records.

## Inputs

- `aws-access-key-id` (**Required**): The AWS access key ID with the necessary permissions to make changes in Route 53.
- `aws-secret-access-key` (**Required**): The AWS secret access key for the given access key ID.
- `aws-region` (**Required**): The AWS region where the Route 53 hosted zone is located.
- `route53-hosted-zone-id` (**Required**): The ID of the Route 53 hosted zone where the domain is registered.
- `domain-name` (**Required**): The domain name to update the geolocation records for.
- `load-balancer-dns` (**Required**): The DNS name of the load balancer to be used as the value for the geolocation records.
- `load-balancer-hosted-zone-id` (**Required**): The HostedZoneID of the load balancer to be used.
- `geo-codes` (**Required**): A comma-separated list of two-letter country or continent codes for which the geolocation records should be added or updated.
- `ttl` (Optional, Default: 10): The Time to Live (TTL) value to be set for the geolocation records.

## Example Usage

```yaml
name: Update Geolocation Records

on:
  push:
    branches: [ main ]

jobs:
  update-geolocation-records:
    runs-on: ubuntu-latest
    steps:
    - name: Update Geolocation Records
      uses: saif-qureos/aws-route53-geolocation-updater@v2.0.4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
        route53-hosted-zone-id: ZXXXXXXXXXXXXXX
        domain-name: example.com
        load-balancer-dns: my-load-balancer.us-east-1.elb.amazonaws.com
        load-balancer-hosted-zone-id: ZXXXXXXXXXXXXXX
        geo-codes: US,EU,AE
        ttl: 10

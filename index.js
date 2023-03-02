const AWS = require('aws-sdk');
const route53 = new AWS.Route53();
const core = require('@actions/core');

async function upsertRecords(domainName, geoCodes, loadBalancerDns, loadBalancerHostedZoneId, route53HostedZoneId) {
  const records = await getRecordsByDomainName(domainName, route53HostedZoneId);
  const recordsToDelete = records.filter(record => {
    const isDefaultRecord = record.Type === 'A' && record.Name === domainName && record.AliasTarget && record.AliasTarget.DNSName === loadBalancerDns;
    const isGeoRecord = record.Type === 'A' && record.AliasTarget && record.AliasTarget.DNSName === loadBalancerDns && geoCodes.includes(record.GeoLocation.ContinentCode || record.GeoLocation.CountryCode);
    return isGeoRecord && !isDefaultRecord;
  });

  // This code will first check if the record is the default record (the one with the domain name) and ignore it. For other records, it will check if they are geolocation records and include them only if they are not the default record.
  await Promise.all(recordsToDelete.map(record => deleteRecord(route53HostedZoneId, record)));

  const resourceRecords = geoCodes.map(code => {
    const geoLocation = code.length === 2 ? { CountryCode: code } : { ContinentCode: code };
    return { Value: loadBalancerDns, GeoLocation: geoLocation, TTL: 10 };
  });

  const upsertParams = {
    HostedZoneId: route53HostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: domainName,
            Type: 'A',
            AliasTarget: {
              DNSName: loadBalancerDns,
              EvaluateTargetHealth: false,
              HostedZoneId: loadBalancerHostedZoneId,
            },
            ResourceRecords: resourceRecords,
            TTL: 10,
          },
        },
      ],
    },
  };

  await route53.changeResourceRecordSets(upsertParams).promise();
}

async function deleteRecord(route53HostedZoneId, record) {
  const deleteParams = {
    HostedZoneId: route53HostedZoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: 'DELETE',
          ResourceRecordSet: record,
        },
      ],
    },
  };
  await route53.changeResourceRecordSets(deleteParams).promise();
}

async function getRecordsByDomainName(domainName, route53HostedZoneId) {
  const listParams = {
    HostedZoneId: route53HostedZoneId,
    StartRecordName: domainName,
    StartRecordType: 'A',
  };
  let records = [];

  do {
    const res = await route53.listResourceRecordSets(listParams).promise();
    records = records.concat(res.ResourceRecordSets);
    listParams.NextRecordName = res.NextRecordName;
    listParams.NextRecordType = res.NextRecordType;
  } while (listParams.NextRecordName && listParams.NextRecordType);

  return records;
}


async function run() {

  const route53HostedZoneId = core.getInput("route53-hosted-zone-id", { required: true });
  const loadBalancerHostedZoneId = core.getInput("load-balancer-hosted-zone-id", { required: true });
  const domainName = core.getInput("domain-name", { required: true });
  const geoCodes = core.getInput("geo-codes", { required: true }).split(",").map((code) => code.trim());
  const loadBalancerDns = core.getInput("load-balancer-dns", { required: true });

  await upsertRecords(domainName, geoCodes, loadBalancerDns, loadBalancerHostedZoneId, route53HostedZoneId);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

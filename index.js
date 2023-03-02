const AWS = require('aws-sdk');
const route53 = new AWS.Route53();

async function upsertRecords(domainName, geoCodes, loadBalancerDns, loadBalancerHostedZoneId, route53HostedZoneId) {
  const records = await getRecordsByDomainName(domainName, route53HostedZoneId);
  const recordsToDelete = records.filter(record => record.Type === 'A' && record.AliasTarget === undefined && !geoCodes.includes(record.GeoLocation.ContinentCode || record.GeoLocation.CountryCode));

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

async function getRecordsByDomainName(domainName, hostedZoneId) {
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
  const route53HostedZoneId = core.getInput("route53-hosted-zone-id");
  const loadBalancerHostedZoneId = core.getInput("load-balancer-hosted-zone-id");
  const domainName = core.getInput("domain-name");
  const geoCodes = core.getInput("geo-codes").split(",").map((code) => code.trim());
  const loadBalancerDns = core.getInput("load-balancer-dns");

  await upsertRecords(domainName, geoCodes, loadBalancerDns, loadBalancerHostedZoneId, route53HostedZoneId);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});

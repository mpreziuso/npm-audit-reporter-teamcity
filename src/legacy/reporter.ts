import { IConfig } from '../config';
import { TeamcityServiceMessages } from '../model';
import { debug } from '../util';
import { IAuditLegacyMetadata, IAuditLegacyOutput } from './model';

function isVulnerable(auditMetadata: IAuditLegacyMetadata) {
  return (
    auditMetadata.vulnerabilities.info +
      auditMetadata.vulnerabilities.low +
      auditMetadata.vulnerabilities.moderate +
      auditMetadata.vulnerabilities.high +
      auditMetadata.vulnerabilities.critical >
    0
  );
}

export default function reporter(
  tsm: TeamcityServiceMessages,
  { inspectionTypeId, inspectionName, inspectionCategory, inspectionSeverity }: IConfig,
  auditResult: IAuditLegacyOutput,
) {
  if (isVulnerable(auditResult.metadata)) {
    tsm.inspectionType({
      category: inspectionCategory,
      description: 'https://docs.npmjs.com/cli/audit.html',
      id: inspectionTypeId,
      name: inspectionName,
    });

    Object.keys(auditResult.advisories).forEach((advisoryId) => {
      const advisoryElement = auditResult.advisories[advisoryId];
      debug('current element:', advisoryElement);

      tsm.inspection({
        SEVERITY: inspectionSeverity,
        file: `module: "${advisoryElement.module_name}"`,
        message: `${advisoryElement.overview}
severity: ${advisoryElement.severity},
versions: ${advisoryElement.findings.map((f) => f.version).join(', ')},
dependency of: ${advisoryElement.findings
          .reduce((acc, prev) => {
            prev.paths.forEach((path) => {
              const dependencyOf = path.split('>')[0];
              if (!acc.includes(dependencyOf)) {
                acc.push(dependencyOf);
              }
            });
            return acc;
          }, [])
          .join(', ')},
vulnerable_versions: ${advisoryElement.vulnerable_versions},
patched_versions: ${advisoryElement.patched_versions},
recommendation: ${advisoryElement.recommendation},
advisory: ${advisoryElement.url}`,
        typeId: inspectionTypeId,
      });
    });
  }
}

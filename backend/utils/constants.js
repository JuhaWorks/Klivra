/**
 * Strategic Taxonomy Mapping
 * Used by Task Model for domain automation and Gamification Service for XP distribution.
 */
const DOMAIN_MAPPING = {
    Strategic: ['Epic', 'Feature', 'Story', 'Discovery', 'Research', 'Strategy'],
    Engineering: ['DevOps', 'Refactor', 'Technical Debt', 'QA', 'Performance', 'Engineering', 'Architecture'],
    Sustainability: ['Maintenance', 'Hygiene', 'Task', 'Sustainability', 'Security Patch', 'Legacy'],
    Operations: ['Bug', 'Security', 'Compliance', 'Meeting', 'Review', 'Support', 'Operations', 'Admin']
};

module.exports = {
    DOMAIN_MAPPING
};

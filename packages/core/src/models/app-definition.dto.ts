
// An app definition is simply a third party application which we want to integrate with 
// It may be from where the workflow is triggered, or where a workflow performs an action

export class AppDefinitionConfig {
    constructor(
        public id: string,
        public name: string,
        public logoSrc: string,
        public version: string,
        public groupId: string,

        public triggers: WorkflowTriggerConfig[],
    ) {}
}

// you can ignore this for now. basically for each published workflow you'd want to version to be bumped
// so to match them all you can just use a group id
// latest stable is the highest id and "unstable" is the active development
// later this can be improved to support environments etc
export class AppGroup {
    constructor(
        public id: string
    ) 
    {}
}
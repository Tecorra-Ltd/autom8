
// basic boiler plate to slowly work in to
// start by moving these folders with injectable services
// the basic idea is you have a workflow,
// which is made up of workflow steps, that are grouped in a workflow router
// the workflow executes each router
// which decides whether or not to execute the steps

class Workflow {
    id: string
    name: string
    steps: WorkflowRouter[]
    triggers: WorkflowTrigger[]

    async run() {
        let context: WorkflowContext = {};

        for (const step of this.steps) {
            await step.run(context);
        }       
    }
}

type AuthMode = 'OAUTH'
type WorkflowRouterType = 'PASS_THROUGH'

type WorkflowContext = {

}

class WorkflowRouter {
    constructor(
        public type: WorkflowRouterType,
        public steps: WorkflowAction[],
    ) {}

    async #runSteps(steps: WorkflowAction[]) {
        for (const step of steps)
            await step.run();
    }

    async run(context: WorkflowContext) {
        switch (this.type) {
            case 'PASS_THROUGH': 
                await this.#runSteps(
                    this.steps
                );
                break;

            default: 
                throw new Error(`Unknown router type ${this.type} passed to WorkflowRouter.run()`);
        }
    }
}

type WorkflowDataConfig = {
    id: string
    label: string
    helperText: string
    key: string
    type: 'INT' | 'FLOAT' | 'STRING'
    isArray: boolean
    defaultValue: any
    options: {
        isRequired: boolean
        // how data is provided: does the user input it, select from a dropdown or is this automatically obtained from an API?
        sourceType: 'USER_INPUT' | 'SELECT' | 'API'
        selectConfig?: {
            options: { label: string, value: string }[]
        }
        apiConfig?: {
            url: string
            isPaginated: boolean
            // url parameters the API needs to get
            urlParams: { [key: string]: string }[]
            // headers the api needs
            headers: { [key: string]: string }
        }
    }
}

type WorkflowActionData = {
    id: string
    data: any
    config: WorkflowDataConfig
}

type WorkflowStepSensitiveData = {
    id: string
    key: string
    name: string
    data: string
    type: 'EMAIL' | 'KEY'
}

abstract class WorkflowTrigger {
    constructor(
        public readonly id: string,
        public name: string,
        private sensitiveData: WorkflowStepSensitiveData[],
        public config: WorkflowTriggerConfig,
    ) {}
}

// things to think about and add later: config for sensitive data, data manipulation to get the right format, validation etc
abstract class WorkflowTriggerConfig {
    constructor(
        public isVisible: boolean,
        public key: string,
        public name: string,
        public description: string,
        public appId: string,
        public apiSubscriptionUrl?: string,
        public apiUnsubscribeUrl?: string,
        public apiPollingUrl?: string,
        public apiHistoryUrl?: string, // get missed updates
    ) {}
}

abstract class WorkflowAction {
    constructor(
        public readonly id: string,
        public name: string,
        public position: number,
        public config: WorkflowActionConfig,
        data: WorkflowActionData[], 
        private readonly sensitiveData: WorkflowStepSensitiveData[],
        public readonly context: WorkflowContext,
        private onComplete: (step: WorkflowAction) => Promise<void>,
        private onFailure: (step: WorkflowAction) => Promise<void>,
    ) {
        this.data = data.reduce((prev, cur) => {
            return {
                ...prev,
                [cur.config.key]: cur,
            };
        }, {});

        this.#sensitiveData = sensitiveData.reduce((prev, cur) => {
            return {
                ...prev,
                [cur.key]: cur,
            };
        }, {});
    }

    public readonly data: { [key: string ]: WorkflowActionData };
    readonly #sensitiveData: { [key: string]: WorkflowStepSensitiveData };

    protected abstract authenticate(): Promise<void>;

    protected abstract executeStep(): Promise<void>;

    getData(key: string, required: boolean = true) {
        if (this.data.hasOwnProperty(key))
            return this.data[key];

        if (required) {
            throw new Error(`Data ${key} is missing in workflow step ${this.id}; Unable to retrieve.`);
        }

        return undefined;
    }

    async run() {
        try {
            await this.authenticate();
            await this.executeStep();
            await this.onComplete(this);
        }
        catch (e) {
            await this.onFailure(this);
        }
    }    
}

abstract class WorkflowActionConfig {
    constructor(
        public id: string,
        public name: string,
        public description: string,
        public isVisible: boolean,
        public dataConfig: any, // for you to think about
        public actionConfig: any, // for you to think about
    ) 
    {}
}
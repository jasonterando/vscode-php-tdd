"use strict";
import { SpawnService } from '../services/spawn-service';
import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';

export type SpawnServiceFactoryType = (ui: IVisualCodeShim, mirrorOutput?: boolean) => SpawnService;
export default (ui: IVisualCodeShim, mirrorOutput: boolean = true) => {
    return new SpawnService(ui, mirrorOutput);
};
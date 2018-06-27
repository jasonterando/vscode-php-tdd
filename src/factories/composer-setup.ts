"use strict";

import { ComposerSetupService } from '../services/composer-setup-service';
import { IVisualCodeShim } from '../models/interfaces/vs-code-shim';
import SpawnServiceFactory from './spawn';

export default (ui: IVisualCodeShim) => {
    return new ComposerSetupService(ui, SpawnServiceFactory);
};
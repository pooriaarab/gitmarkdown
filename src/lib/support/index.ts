import { createSupportRegistry } from "@pooriaarab/support";

import { supportConfig } from "./content";

export const supportRegistry = createSupportRegistry(supportConfig);
export { supportConfig };

export const articleHref = supportRegistry.articleHref.bind(supportRegistry);
export const getSupportArticle = supportRegistry.getArticle.bind(supportRegistry);

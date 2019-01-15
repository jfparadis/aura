/*
 * Copyright (C) 2013 salesforce.com, inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.auraframework.impl.css.parser;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.auraframework.Aura;
import org.auraframework.adapter.StyleAdapter;
import org.auraframework.css.FlavorAnnotation;
import org.auraframework.css.StyleContext;
import org.auraframework.css.TokenValueProvider;
import org.auraframework.def.BaseStyleDef;
import org.auraframework.def.DefDescriptor;
import org.auraframework.def.FlavoredStyleDef;
import org.auraframework.impl.css.parser.plugin.FlavorCollectorPlugin;
import org.auraframework.impl.css.parser.plugin.FlavorPlugin;
import org.auraframework.impl.css.parser.plugin.SelectorScopingPlugin;
import org.auraframework.impl.css.parser.plugin.TokenFunctionPlugin;
import org.auraframework.impl.css.parser.plugin.TokenPropertyValidationPlugin;
import org.auraframework.impl.css.parser.plugin.TokenSecurityPlugin;
import org.auraframework.impl.css.parser.plugin.UrlCacheBustingPlugin;
import org.auraframework.system.AuraContext.Mode;
import org.auraframework.throwable.quickfix.StyleParserException;

import com.salesforce.omakase.Omakase;
import com.salesforce.omakase.PluginRegistry;
import com.salesforce.omakase.plugin.Plugin;
import com.salesforce.omakase.plugin.conditionals.Conditionals;
import com.salesforce.omakase.plugin.conditionals.ConditionalsValidator;
import com.salesforce.omakase.plugin.core.AutoRefine;
import com.salesforce.omakase.plugin.core.AutoRefine.Match;
import com.salesforce.omakase.plugin.core.StandardValidation;
import com.salesforce.omakase.plugin.prefixer.PrefixCleaner;
import com.salesforce.omakase.plugin.prefixer.Prefixer;
import com.salesforce.omakase.plugin.syntax.UnquotedIEFilterPlugin;
import com.salesforce.omakase.writer.StyleWriter;

/**
 * Parses CSS source code.
 *
 * Use either {@link #initial(StyleAdapter)} {@link #runtime(StyleContext,StyleAdapter)} to get started.
 */
public final class CssPreprocessor {
    /** Use one of the constructor methods */
    private CssPreprocessor() {
    }

    /** For the initial preprocessing of css, this includes all syntax validations and static rework */
    public static ParserConfiguration initial(StyleAdapter styleAdapter) {
        return new ParserConfiguration(styleAdapter, false);
    }

    public static ParserConfiguration runtime(StyleContext styleContext, StyleAdapter styleAdapter) {
        return new ParserConfiguration(styleAdapter, true).styleContext(styleContext);
    }

    /** For parsing css without any of the default plugins */
    public static ParserConfiguration raw() {
        return new ParserConfiguration(Aura.getStyleAdapter());
    }

    /** Configuration for the css parser */
    public static final class ParserConfiguration {
        private String content;
        private String resourceName;
        private final boolean runtime;
        private final List<Plugin> plugins = new ArrayList<>();
        private StyleAdapter styleAdapter;
        
        private static Plugin prefixerPlugin;
        private static Plugin autoRefinePlugin;
        
        /* double-check lock the prefixer plugin */ 
        private Plugin getPrefixerPlugin() {
            if (prefixerPlugin == null) {
                synchronized (ParserConfiguration.class) {
                    if (prefixerPlugin == null) {
                        prefixerPlugin = Prefixer.defaultBrowserSupport().prune(true).rearrange(true);
                    }
                }
            }
            return prefixerPlugin;
        }
        
        /* double-check lock the autoRefine plugin */
        private Plugin getAutoRefinePlugin() {
            if (autoRefinePlugin == null) {
                synchronized (ParserConfiguration.class) {
                    if (autoRefinePlugin == null) {
                        autoRefinePlugin = AutoRefine.only(Match.AT_RULES);
                    }
                }
            }
            return autoRefinePlugin;
        }
        
        public ParserConfiguration(StyleAdapter styleAdapter) {
            this.runtime = false;
            this.styleAdapter = styleAdapter;
        }

        public ParserConfiguration(StyleAdapter styleAdapter, boolean runtime) {
            this.runtime = runtime;
            this.styleAdapter = styleAdapter;

            if (!runtime) {
                plugins.addAll(styleAdapter.getCompilationPlugins());
                plugins.add(new UrlContextPathPlugin());
            }

            plugins.add(new UrlCacheBustingPlugin());
            plugins.add(new UnquotedIEFilterPlugin());
            plugins.add(getPrefixerPlugin());
            plugins.add(PrefixCleaner.mismatchedPrefixedUnits());
            plugins.addAll(styleAdapter.getRuntimePlugins());
        }

        /** specify css source code */
        public ParserConfiguration source(CharSequence content) {
            this.content = content.toString();
            return this;
        }

        /** name of the resource being parsed. used for error reporting */
        public ParserConfiguration resourceName(String resourceName) {
            this.resourceName = resourceName;
            return this;
        }

        /** replacement class name (no dot), e.g., "uiButton", this enables selector scoping (.THIS enforcement) */
        public ParserConfiguration componentClass(String componentClass, boolean validate) {
            if (!runtime) {
                plugins.add(new SelectorScopingPlugin(componentClass, validate));
            }
            return this;
        }

        /** enables aura tokens */
        public ParserConfiguration tokens(DefDescriptor<? extends BaseStyleDef> style, TokenValueProvider tvp) {
            if (runtime) {
                plugins.add(new TokenFunctionPlugin(tvp));
                plugins.add(getAutoRefinePlugin());
            } else {
                plugins.add(new TokenFunctionPlugin(tvp));
                if (styleAdapter.tokenPropertyValidation(style)) {
                    plugins.add(new TokenPropertyValidationPlugin());
                }
                plugins.add(new TokenSecurityPlugin());
            }
            return this;
        }

        /** enables aura flavors processing */
        public ParserConfiguration flavors(DefDescriptor<FlavoredStyleDef> flavor) {
            plugins.add(new FlavorPlugin(flavor));
            return this;
        }

        /** sets allowed conditionals (e.g., set of allowed browsers) */
        public ParserConfiguration allowedConditions(Iterable<String> allowedConditions) {
            plugins.add(new ConditionalsValidator(allowedConditions));
            return this;
        }

        /** eliminate conditionals not matching values in this style context */
        public ParserConfiguration styleContext(StyleContext styleContext) {
            Conditionals conditionals = new Conditionals();
            if (styleContext != null) {
                conditionals.config().addTrueConditions(styleContext.getAllTrueConditions());
            }
            plugins.add(conditionals);
            return this;
        }

        /** specifies an additional plugin to run */
        public ParserConfiguration extra(Plugin plugin) {
            this.plugins.add(plugin);
            return this;
        }

        /** specifies any additional css plugins to run */
        public ParserConfiguration extras(List<Plugin> plugins) {
            this.plugins.addAll(plugins);
            return this;
        }

        /** parses the CSS according to the current configuration */
        public ParserResult parse() throws StyleParserException {
            // determine the output compression level based on the aura mode
            Mode mode = Mode.DEV;

            if (Aura.getContextService().getCurrentContext() != null) {
                mode = Aura.getContextService().getCurrentContext().getMode();
            }
            StyleWriter writer = mode.prettyPrint() ? StyleWriter.inline() : StyleWriter.compressed();

            if (!runtime) {
                // write annotated comments out on the compilation pass, in case the runtime pass needs them
                writer.writeAnnotatedComments(true);

                // we only want full refinement and validation on the compilation pass. During subsequent runtime calls
                // we will already know the code is valid so no need to validate again. This should be the last plugin
                // so we don't preempt other refiners.
                plugins.add(new StandardValidation()); // todo, don't do this in raw mode
            }

            // do the parsing
            CssErrorManager em = new CssErrorManager(resourceName);
            PluginRegistry registry = Omakase.source(content).use(plugins).use(writer).use(em).process();

            // report any errors found during parsing
            if (em.hasErrors()) {
                throw new StyleParserException(em.summarize(), null);
            }

            // return the results
            ParserResult result = new ParserResult();

            result.content = writer.write();
            if (mode.isDevMode()) {
                result.content += "\n"; // in dev mode print an extra new line after each stylesheet for readability
            }

            Optional<TokenFunctionPlugin> tokensPlugin = registry.retrieve(TokenFunctionPlugin.class);
            if (tokensPlugin.isPresent()) {
                result.expressions = tokensPlugin.get().expressions();
            }

            Optional<FlavorCollectorPlugin> flavorCollector = registry.retrieve(FlavorCollectorPlugin.class);
            if (flavorCollector.isPresent()) {
                result.flavorAnnotations = flavorCollector.get().getFlavorAnnotations();
            }

            Optional<TokenPropertyValidationPlugin> tokenPropertyValidationPlugin = registry.retrieve(TokenPropertyValidationPlugin.class);
            if (tokenPropertyValidationPlugin.isPresent()) {
                result.tokensInCssProperties = tokenPropertyValidationPlugin.get().tokensInCssProperties;
            }

            return result;
        }
    }

    /** Result of calling {@link ParserConfiguration#parse()} */
    public static final class ParserResult {
        private String content;
        private Set<String> expressions;
        private Map<String, FlavorAnnotation> flavorAnnotations;
        private Map<String, Set<String>> tokensInCssProperties;

        /** parsed content */
        public String content() {
            return content;
        }

        /** all token references found in the source */
        public Set<String> expressions() {
            return expressions;
        }

        /** all flavors metadata found in the source */
        public Map<String, FlavorAnnotation> flavorAnnotations() {
            return flavorAnnotations;
        }

        public Map<String, Set<String>> tokensInCssProperties() {
            return tokensInCssProperties;
        }
    }
}

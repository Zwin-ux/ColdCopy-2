ColdCopy — Master Reference Document
Purpose

ColdCopy is a precision outreach engine. It generates highly targeted cold emails by running a deterministic multi stage AI pipeline. The emphasis is consistency, accuracy, and constrained creativity rather than raw prompting.

Core Philosophy

Research before writing.

Angles before prose.

Structure before tone.

Human pass at the end.

The system protects against bad prompting by locking every stage into narrow roles.

User Flow

User provides

Description of what they sell

Link or text about the target

Tone preference

System returns

Research snapshot

Final email

Option to regenerate with a new angle

Pipeline Overview

Target scrape

Signal extraction

Angle generation

Template assembly

Tone adaptation

Humanizer pass

Each step is isolated, typed, and predictable.

Data Structures

TargetProfile industry role company recent_achievements notable_products_or_services public_pain_points writing_tone values_or_preferences

TargetSignals buying_reason credibility_hook emotional_hook

OutreachAngles value_angle curiosity_angle social_angle

EmailDraft body

FinalEmail body selected_angle

Prompts

All prompts are stored as constants.

Stage 1: Target scrape

Extract only factual signals. Return JSON with the fixed fields. No embellishments.

Stage 2: Signal extraction

Produce three outreach relevant hooks tied to the profile.

Stage 3: Angle generation

Create three angles referencing the hooks. Short lines.

Stage 4: Template assembly

Build a four line email using a tight structure.

Stage 5: Tone adaptation

Rewrite using chosen tone without adding ideas.

Stage 6: Humanizer pass

Add subtle imperfections. Remove AI symmetry.

Backend Structure

pipeline folder

interfaces folder

prompts module

routes folder with POST /api/generate

logging for each stage

error handling via zod

Front End Structure

Offer input

Target input

Tone selector

Generate button

Research snapshot display

Email output with copy button

Regenerate button

Branding

ColdCopy identity is surgical, modern, and confident.

Logo idea: geometric envelope with a spark. Monochrome or two tone. Futuristic clean aesthetic.

Expansion Path

Multi target batch mode

Auto follow ups

CRM export

Deliverability tools

Goal

Ship a working deterministic outreach engine with clean UX and predictable output.
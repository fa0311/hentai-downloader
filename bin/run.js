#!/usr/bin/env node

import 'source-map-support/register.js'
import {execute} from '@oclif/core'

await execute({dir: import.meta.url})

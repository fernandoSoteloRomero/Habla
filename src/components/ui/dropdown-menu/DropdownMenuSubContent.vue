<script setup lang="ts">
import type { DropdownMenuSubContentEmits, DropdownMenuSubContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import {
  DropdownMenuSubContent,
  useForwardPropsEmits,
} from 'reka-ui'

const props = defineProps<DropdownMenuSubContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DropdownMenuSubContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DropdownMenuSubContent
    data-slot="dropdown-menu-sub-content"
    v-bind="forwarded"
    :class="cn('border-2 border-ink bg-popover text-popover-foreground min-w-[96px] rounded-lg p-1 cn-menu-translucent z-50 max-w-(--reka-dropdown-menu-content-available-width) origin-(--reka-dropdown-menu-content-transform-origin) overflow-hidden', props.class)"
  >
    <slot />
  </DropdownMenuSubContent>
</template>

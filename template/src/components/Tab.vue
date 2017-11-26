<template lang="html">
  <section class="vue" v-show="isActive">
    <slot></slot>
  </section>
</template>

<script>
export default {
  props: [ 'name' ],
  data () {
    return {
      isActive: false,
      hash: ''
    }
  },
  created () {
    this.hash = '#' + encodeURIComponent(this.name.replace(/\s+/g, '-').toLowerCase())
  }
}
</script>

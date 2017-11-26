<template lang="html">
  <div class="tabset">
    <div class="tabnav" role="tablist">
      <button v-for="tab in tabs"
        :class="{ active: tab.isActive }"
        @click.prevent="pickTab(tab)"
        v-html="tab.name">
      </button>
    </div>
    <div class="tabs-container">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return { tabs: [] }
  },
  created () {
    this.tabs = this.$children
  },
  mounted () {
    if (this.tabs.length > 0) this.tabs[0].isActive = true
  },
  methods: {
    setTab (newTab) {
      this.tabs.forEach(tab => {
        tab.isActive = tab === newTab
      })
    },
    pickTab (chosen) {
      this.setTab(chosen)
      this.$emit('changed', chosen)
    },
    mobilePickTab (e, o) {
      let tab = this.tabs.find(t => t.name === e.target.value)
      if (!tab) return
      this.pickTab(tab)
    }
  }
}
</script>

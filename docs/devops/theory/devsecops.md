# 什么是 DevSecOps

DevOps 是指开发，测试和运营团队之间的协作环境，以实现持续交付。

作为 DevOps 思维方式的扩展，DevSecOps 将安全控件和流程嵌入到 DevOps 工作流程中，并自动执行核心的安全任务。这些安全性原则是在开发过程的早起引入的，并在整个开发生命周期中得到实施。

DevSecOps 专注解决 DevOps Automation 安全问题，例如配置管理，组件分析等。

除了为 DevOps 提供安全知识和实践外，DevSecOps 还将应用程序的开发知识和流程整合到安全团队中，以实现团队间的高效合作。在 IT 领域中，关于 DevSecOps 一词的用法还没有一致意见。目前也有 DevOpsSec, SecDevOps 或者 Rugged Devops。

## 主要组成

- 代码分析：通过小部分代码交付，快读识别漏洞
- 变更管理：高速度和高效率的变更，确定变更的影响是正面还是负面
- 监控合规性：对于应该遵守的法规等进行审核
- 识别威胁：代码更新伴随着潜在的新威胁，尽早识别这些威胁并立即做出应对策略
- 漏洞评估：涉及对新漏洞的分析以及响应。
- 培训：参与安全性相关的培训，并配置确定例程的准则

## 工具

DevSecOps 的采用涉及到评估应用程序的安全风险和代码测试，专用工具是比不可少的。

目前市面上已经有多种工具促进 DevSecOps 实施的方方面面。

- 可视化工具： Kibana 和 grafana 之类的工具可以帮助识别，发展信息安全与操作共享
- 自动化工具：每当发现安全缺陷时，StackStorm 之类的工具可以帮助提供脚本化的补救策略
- 搜寻工具：这些工具有助于检查安全异常，例如 Mirador，OSSEC，MozDef 和 GRR 等
- 测试工具：测试是 DevSecOps 的关键要素，有 Gauntlt，Spyk，Chef Inspec，Hakiri,Infer 和 Lynis
- 警报工具：Elastalert，Alerta 和 411 等工具会提供警报和通知
- 威胁情报工具：这些工具可以捕获威胁情报，包括 OpenTex，关键堆栈和被动总计
- 攻击建模工具：有助于实施攻击建模和安全防御

## 如何实现 DevSecOps

- 每个阶段强制性安全
- 安全前进性彻底评估
- 在代码级别进行安全相关的更改
- 自动化所有可能的过程
- 通过警报和仪表盘进行持续监控


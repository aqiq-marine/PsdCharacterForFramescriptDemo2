import React, { useEffect, useMemo, useRef, useState } from "react"

import { PsdCharacterElement as PsdElm, type BlockNode, type CharacterNode, type DeclareAnimationNode, type DeclareVariableNode, type MotionNode, type MotionSequenceNode, type VoiceNode } from "./ast"
import { readPsd, type Psd } from "ag-psd"
import { parsePsdCharacter } from "./parser"
import { renderPsd } from "ag-psd-psdtool"
import { useAnimation, useVariable, type Variable } from "../animation"
import { useCurrentFrame, useGlobalCurrentFrame } from "../frame"
import { Sound } from "../sound/sound"
import { Clip, ClipSequence } from "../clip"

type PsdCharacterProps = {
  psd: string
  children: React.ReactNode
}

type PsdPath = {
  path: string
}

type PsdOptions = Record<string, any>
type OptionRegister = () => {
    update: (opt: Record<string, any>) => void
    getter: () => Record<string, any>
    unregister: () => void
}


export const PsdCharacter = ({
  psd,
  children
}: PsdCharacterProps) => {
  const [myPsd, setPsd] = useState<Psd | undefined>(undefined)
  const [ast, setAst] = useState<CharacterNode | undefined>(undefined)

  const registry = useRef(new Map<string, PsdOptions>())
  const order = useRef<string[]>([])

  const [options, setOptions] = useState<PsdOptions>({})

  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetchPsd(normalizePsdPath(psd)).then(p => setPsd(p))
    setAst(parsePsdCharacter(children))
  }, [])

  useEffect(() => {
    if (typeof myPsd !== "undefined" && canvas.current) {
      renderPsd(myPsd, options, { canvas: canvas.current })
    }
  }, [myPsd, options, canvas])

  const recompute = () => {
    const merged = Object.assign({}, ...registry.current.values())
    setOptions(merged)
  }

  const register = () => {
    const id = crypto.randomUUID()

    registry.current.set(id, {})
    order.current.push(id)

    const update = (opt: PsdOptions) => {
      registry.current.set(id, opt)
      recompute()
    }

    const unregister = () => {
      registry.current.delete(id)
      order.current = order.current.filter(x => x !== id)
      recompute()
    }

    const getter = () => {
      const index = order.current.indexOf(id)

      const prevIds = order.current.slice(0, index)

      const prevOptions = prevIds.map(i => registry.current.get(i) ?? {})

      return Object.assign({}, ...prevOptions)
    }

    return {
      update,
      getter,
      unregister,
    }
  }


  return (
    <>
      <canvas ref={canvas} />
      {ast?.children.map((child, i) => {
        switch (child.type) {
          case PsdElm.MotionSequence:
            return <MotionSequenceRuntime
              key={i}
              ast={child}
              variables={{}}
              register={register}
            />
          case PsdElm.DeclareVariable:
            return <DeclareVariableRuntime
              key={i}
              ast={child}
              variables={{}}
              initializingVariables={{}}
              register={register}
            />
          case PsdElm.Voice:
            return <VoiceRuntime
              key={i}
              ast={child}
              variables={{}}
              register={register}
            />
          case PsdElm.Motion:
            return <MotionRuntime
              key={i}
              ast={child}
              variables={{}}
              register={register}
            />
          default:
            return <div/>
        }
      })}
    </>
  )
}

type MotionSequenceRuntimeProps = {
  ast: MotionSequenceNode
  variables: Record<string, Variable<any>>
  register: OptionRegister
}

const MotionSequenceRuntime = ({
  ast,
  variables,
  register
}: MotionSequenceRuntimeProps) => {
  const {update, getter, unregister} = register()
  const curRegister: OptionRegister = () => {
    return {update, getter, unregister}
  }

  return (
    <ClipSequence>
      {ast.children.map(child => {
        switch (child.type) {
          case PsdElm.DeclareVariable:
            return <DeclareVariableRuntime
              ast={child}
              variables={variables}
              initializingVariables={{}}
              register={curRegister}
            />
          case PsdElm.Block:
            return <BlockRuntime
              ast={child}
              variables={variables}
              register={curRegister}
            />
          case PsdElm.Voice:
            return <VoiceRuntime
              ast={child}
              variables={variables}
              register={curRegister}
            />
          case PsdElm.Motion:
            return <MotionRuntime
              ast={child}
              variables={variables}
              register={curRegister}
            />
          default:
            return <div/>
        }
      }).map((child, i) => <Clip key={i}> {child} </Clip>)}
    </ClipSequence>
  )
}

type DeclareVariableRuntimeProps = {
  ast: DeclareVariableNode
  variables: Record<string, Variable<any>>
  initializingVariables: Record<string, Variable<any>>
  register: OptionRegister
}

const DeclareVariableRuntime = ({
  ast,
  variables,
  initializingVariables,
  register
}: DeclareVariableRuntimeProps) => {
  const variable = useVariable(ast.initValue)
  const newInitVariables = {[ast.variableName]: variable, ...initializingVariables}

  switch (ast.children.type) {
    case PsdElm.DeclareVariable:
      return <DeclareVariableRuntime
        ast={ast.children}
        variables={variables}
        initializingVariables={newInitVariables}
        register={register}
      />
    case PsdElm.DeclareAnimation:
      return <DeclareAnimationRuntime
        ast={ast.children}
        variables={variables}
        initializingVariables={newInitVariables}
        register={register}
      />
    default:
      return <div/>
  }
}

type BlockRuntimeProps = {
  ast: BlockNode
  variables: Record<string, Variable<any>>
  register: OptionRegister
}

const BlockRuntime = ({
  ast,
  variables,
  register
}: BlockRuntimeProps) => {
  const {update, getter: superGetter, unregister} = register()

  useEffect(() => {
    return () => unregister()
  }, [])

  const curRegistry = useRef(new Map<string, PsdOptions>())
  const order = useRef<string[]>([])

  const [options, setOptions] = useState<PsdOptions>({})

  const recompute = () => {
    const merged = Object.assign({}, ...curRegistry.current.values())
    setOptions(merged)
  }

  const curRegister = () => {
    const id = crypto.randomUUID()

    curRegistry.current.set(id, {})
    order.current.push(id)

    const update = (opt: PsdOptions) => {
      curRegistry.current.set(id, opt)
      recompute()
    }

    const unregister = () => {
      curRegistry.current.delete(id)
      order.current = order.current.filter(x => x !== id)
      recompute()
    }

    const getter = () => {
      const index = order.current.indexOf(id)

      const prevIds = order.current.slice(0, index)

      const prevOptions = prevIds.map(i => curRegistry.current.get(i) ?? {})

      return Object.assign(superGetter(), ...prevOptions)
    }

    return {
      update,
      getter,
      unregister,
    }
  }

  useEffect(() => {
    update(options)
  }, [options])


  return (
    <>
      {ast.children.map((child, i) => {
        switch (child.type) {
          case PsdElm.MotionSequence:
            return <MotionSequenceRuntime
              key={i}
              ast={child}
              variables={variables}
              register={curRegister}
            />
          case PsdElm.DeclareVariable:
            return <DeclareVariableRuntime
              key={i}
              ast={child}
              variables={variables}
              initializingVariables={{}}
              register={curRegister}
            />
          case PsdElm.Voice:
            return <VoiceRuntime
              key={i}
              ast={child}
              variables={variables}
              register={curRegister}
            />
          case PsdElm.Motion:
            return <MotionRuntime
              key={i}
              ast={child}
              variables={variables}
              register={curRegister}
            />
          default:
            return <div/>
        }
      })}
    </>
  )
}

type DeclareAnimationRuntimeProps = {
  ast: DeclareAnimationNode
  variables: Record<string, Variable<any>>
  initializingVariables: Record<string, Variable<any>>
  register: OptionRegister
}

const DeclareAnimationRuntime = ({
  ast,
  variables,
  initializingVariables,
  register
}: DeclareAnimationRuntimeProps) => {

  useAnimation(async (ctx) => {
    ast.f(ctx, initializingVariables)
  }, [])

  const curVariables = Object.assign(variables, initializingVariables)

  const {update, getter: superGetter, unregister} = register()

  useEffect(() => {
    return () => unregister()
  }, [])

  const curRegistry = useRef(new Map<string, PsdOptions>())
  const order = useRef<string[]>([])

  const [options, setOptions] = useState<PsdOptions>({})

  const recompute = () => {
    const merged = Object.assign({}, ...curRegistry.current.values())
    setOptions(merged)
  }

  const curRegister = () => {
    const id = crypto.randomUUID()

    curRegistry.current.set(id, {})
    order.current.push(id)

    const update = (opt: PsdOptions) => {
      curRegistry.current.set(id, opt)
      recompute()
    }

    const unregister = () => {
      curRegistry.current.delete(id)
      order.current = order.current.filter(x => x !== id)
      recompute()
    }

    const getter = () => {
      const index = order.current.indexOf(id)

      const prevIds = order.current.slice(0, index)

      const prevOptions = prevIds.map(i => curRegistry.current.get(i) ?? {})

      return Object.assign(superGetter(), ...prevOptions)
    }

    return {
      update,
      getter,
      unregister,
    }
  }

  useEffect(() => {
    update(options)
  }, [options])

  return (
    <>
      {ast.children.map((child, i) => {
        switch (child.type) {
          case PsdElm.MotionSequence:
            return <MotionSequenceRuntime
              key={i}
              ast={child}
              variables={curVariables}
              register={curRegister}
            />
          case PsdElm.DeclareVariable:
            return <DeclareVariableRuntime
              key={i}
              ast={child}
              variables={curVariables}
              initializingVariables={{}}
              register={curRegister}
            />
          case PsdElm.Voice:
            return <VoiceRuntime
              key={i}
              ast={child}
              variables={curVariables}
              register={curRegister}
            />
          case PsdElm.Motion:
            return <MotionRuntime
              key={i}
              ast={child}
              variables={curVariables}
              register={curRegister}
            />
          default:
            return <div/>
        }
      })}
    </>
  )
}

type VoiceRuntimeProps = {
  ast: VoiceNode,
  variables: Record<string, Variable<any>>
  register: OptionRegister
}

const VoiceRuntime = ({
  ast,
  variables,
  register
}: VoiceRuntimeProps) => {
  return <Sound sound={ast.voice} />
}

type MotionRuntimeProps = {
  ast: MotionNode,
  variables: Record<string, Variable<any>>
  register: OptionRegister
}

const MotionRuntime = ({
  ast,
  variables,
  register
}: MotionRuntimeProps) => {
  const { update, getter, unregister } = useMemo(() => register(), [register])

  useEffect(() => {
    return () => unregister()
  }, [])

  const localTime = useCurrentFrame()
  const globalTime = useGlobalCurrentFrame()

  useEffect(() => {
    update(ast.motion(variables, [localTime, globalTime]))
  }, [localTime, globalTime])

  return <div/>
}


const psdCache = new Map<string, Psd>()
const psdPending = new Map<string, Promise<Psd>>()

const fetchPsd = async (psd: PsdPath): Promise<Psd> => {
  const cached = psdCache.get(psd.path)
  if (cached != null) return cached

  const pending = psdPending.get(psd.path)
  if (pending) return pending

  const next = (async () => {
    const res = await fetch(buildPsdUrl(psd))
    if (!res.ok) {
      throw new Error("failed to fetch psd file")
    }
  
    const file = readPsd(await res.arrayBuffer())
    psdCache.set(psd.path, file)
    return file
  })().finally(() => {
    psdPending.delete(psd.path)
  })

  psdPending.set(psd.path, next)
  return next
}

const normalizePsdPath = (psd: PsdPath | string): PsdPath => {
  if (typeof psd === "string") return { path: psd }
  return psd
}

const buildPsdUrl = (pad: PsdPath) => {
  const url = new URL("http://localhost:3000/file")
  url.searchParams.set("path", pad.path)
  return url.toString()
}

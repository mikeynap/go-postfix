# go-postfix package

Golang Postfix Expansion for Atom.

Suggestions appear in autocomplete-go or can be manually triggered.

## Postfix Operators

### .must
Must checks for nil and returns if expression != nil.


`myErr.must()`
```
if myErr != nil {
  return nil, myErr
}
```

`myErr.Error().must(nil)`
```
if err := myErr.Error(); err != nil {
  return nil, err
}
```

The behavior changes slightly if the must is in an assignment.
`blah, err := someFunc().must()``
```
blah, err := someFunc()
if err != nil {
  return err
}
```

`blah, err := someFunc().must(blah)`
```
blah, err := someFunc()
if err != nil {
  return blah2, err
}
```

### .tern(condition, valIfTrue, valIfFalse)
`c.tern(methodReturningBool(),2,3)`
```
c := 2
if methodReturningBool() {
  c = 3
}
```

### val := (condition ? valIfTrue, valIfFalse)
`c := (methodReturningBool() ? "trueString" : "falseString")`
```
c := "trueString"
if methodReturningBool() {
  c = "falseString"
}
```

### .ife(v), .ifne(v)
These functions place the cursor in the resulting if block.

`myVal.ife(true)`
```
if myVal == true {

}
```

### .nil, .nnil, .nilr(rVal)
These functions place the cursor in the resulting if block.

`myVal.nil`
```
if myVal == nil {

}
```


`myVal.nnil`
```
if myVal != nil {

}
```

`myVal.nilr`
```
if myVal == nil {
  return myVal
}
```

`myVal.nilr(-1)`
```
if myVal == nil {
  return -1
}
```

### .for, .for(k,v)
These functions place the cursor in the resulting for block.

`myCollection.for`
```
for i := range myCollection {

}
```

`myCollection.for(_,v)`
```
for _, v := range myCollection {

}
```

### .try, .catch
Try and Catch work identically except for the condition check. try tests for nil equality, catch tests for not nil.

`someFunc().try`
```
if err := someFunc(); err == nil {

}
```

`someFunc().catch(v,_)`
```
if v, _, err := someFunc(); err != nil {

}
```
The behavior changes slightly if the try/catch is in an assignment.

`	a,b := someFunc().try`
```
a,b := someFunc()
if b == nil {

}
```

`a, b := someFunc().catch()`
```
a, b := someFunc()
if b != nil {

}
```


### .print, .printf(fmtString)
`expr.print`
```
fmt.Println(expr)
```

`expr.printf`
```
fmt.Printf("%+v\n", expr)
```

`expr.printf("expr is: %v\n")`
```
fmt.Printf("expr is %v\n", expr)
```

### .len
`myArray.len`
```
len(myArray)
```

### .error
`"Some Error String".error`
```
errors.New("Some Error String")
```

### apply
`myCollection.apply(fmt.Println)`
```
for i := range myCollection {
  fmt.Println(myCollection[i])
}
```

### map
`myCollection.map(someFunction)`
```
for i := range myCollection {
  myCollection[i] = someFunction(myCollection[i])
}
```

### reduce
`arr.reduce(0,f)`
```
result := 0
for i := range arr {
  result = f(arr[i], result)
}
```

`val := arr.reduce(10,f)`
```
val := 10
for i := range arr {
  val = f(arr[i], val)
}
```


`arr.reduce(1, func(v, acc int) int { return v + acc })`
```
res := 1
reduceFunc := func(v,acc int) int { return v + acc }
for i := range arr {
	res = reduceFunc(arr[i], res)
}
```

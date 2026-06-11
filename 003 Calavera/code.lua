if z == 0 then
  if abs(y-2) < 3 or y == -1 then
    if inrange(y,1,2) and inrange(x,-3,-2) then
      return 3
    elseif inrange(y,1,3) and inrange(x,2,3) then
      return 3
    else 
      return 1
    end
  elseif y == 5 and abs(x) < 5 then
    return 1
  elseif inrange(y,-3,-2) and abs(x) < 4 then
    return 1
  elseif inrange(y,-5,-4) and inrange(abs(x),2,3) then
    return 1
  end
end

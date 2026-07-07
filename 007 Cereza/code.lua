absx = abs(x)

if inrange(y,-5,-3) and inrange(z,-1,1) and inrange(absx,2,4) then
return 7
end

if z == 0 then

  if (inrange(y,-2, -1) and absx == 3) or (y       == 0 and x == 3) then
    return 11
  end

  if (inrange(y,0,1) and x == -2) or (x == 2 and inrange(y,1,2)) then
    return 11
  end

  if (y == 2 and x == -1) then
    return 11
  end

  if inrange(x,0,1) and y == 3 then
    return 11
  end

  if y == 4 and x == 1 then
    return 11
  end
end
